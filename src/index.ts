import { Manager, Types } from 'router-primitives';
import { decorate, observable } from 'mobx';

/**
 * Extends the manager and changes how routers are instantialized.
 * Overrides router instantiation to turn routers in Mobx observables.
 */
class MobxManager extends Manager {
  // remove getState and subscribe 
  public createNewRouterInitArgs({ name, config, type, parentName}: Types.IRouterInitParams): Types.IRouterInitArgs {
    const parent = this.routers[parentName];

    return {
      name,
      config: { ...config },
      type: type || 'scene', // TODO make root router an empty router
      parent,
      routers: {},
      manager: this,
      root: this.rootRouter,
    };
  }

  public createRouterFromInitArgs(initalArgs: Types.IRouterInitArgs, routerActionNames: string[]) {
    const routerClass = this.routerTypes[initalArgs.type];
    const mobxRouter = (new (routerClass as any)({ ...initalArgs, actions: routerActionNames }) as Types.IRouter);

    decorate(mobxRouter, {
      state: observable,
      history: observable,
    });

    if (mobxRouter.parent && mobxRouter.parent.state.visible === true) {
      const defaultAction = (mobxRouter.config || {}).defaultAction || [];
      (mobxRouter as any).state = { visible: defaultAction.includes('show') };
    } else if (mobxRouter.isRootRouter) {
      (mobxRouter as any).state = { visible: true };
    } else {
      (mobxRouter as any).state = {};
    }

    (mobxRouter as any).history = [];

    return mobxRouter;
  }

  // location -> newState
  public setNewRouterState(location: Types.IInputLocation) {
    const newState = this.calcNewRouterState(location, this.rootRouter);
    const routers = this.routers
    Object.values(routers).forEach((r) => {
      const routerSpecificState = newState[r.name];

      // only update state if it is defined for this router
      if (routerSpecificState !== undefined) {
        let newHistory = [{...r.state}, ...r.history].filter(s => s !== undefined && s.visible !== undefined)
        if (newHistory.length > 5) { newHistory = newHistory.slice(0, 5); }
  
        (r as any).state = routerSpecificState;
        (r as any).history = newHistory;
      }
    });
  }
}

export { 
  MobxManager, 
};